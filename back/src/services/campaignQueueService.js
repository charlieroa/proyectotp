// src/services/campaignQueueService.js
const prisma = require('../config/prisma');
const { sendCampaignEmail } = require('./emailService');

// Active queues by campaign ID
const activeQueues = new Map();

/**
 * Start sending a campaign's emails.
 * Processes 2 emails per second to respect Resend rate limits.
 */
function startCampaignQueue(campaignId, io) {
  if (activeQueues.has(campaignId)) {
    console.log(`[CampaignQueue] Campaign ${campaignId} already running`);
    return;
  }

  const intervalId = setInterval(async () => {
    try {
      // Get campaign status
      const campaign = await prisma.campaigns.findUnique({
        where: { id: campaignId },
        select: { id: true, status: true, tenant_id: true, subject: true, html_content: true, sent_count: true, failed_count: true, total_recipients: true },
      });

      if (!campaign || campaign.status !== 'sending') {
        stopCampaignQueue(campaignId);
        return;
      }

      // Get next batch of pending recipients (2 at a time)
      const pendingRecipients = await prisma.campaign_recipients.findMany({
        where: { campaign_id: campaignId, status: 'pending' },
        take: 2,
      });

      if (pendingRecipients.length === 0) {
        // All done - mark campaign complete
        await prisma.campaigns.update({
          where: { id: campaignId },
          data: { status: 'completed', completed_at: new Date(), updated_at: new Date() },
        });
        stopCampaignQueue(campaignId);

        // Notify via socket
        if (io) {
          io.to(`tenant:${campaign.tenant_id}`).emit('campaign:progress', {
            campaignId,
            status: 'completed',
            sent_count: campaign.sent_count,
            failed_count: campaign.failed_count,
            total_recipients: campaign.total_recipients,
          });
        }
        return;
      }

      // Send emails
      for (const recipient of pendingRecipients) {
        try {
          await sendCampaignEmail({
            to: recipient.email,
            subject: campaign.subject,
            html: campaign.html_content,
            recipientName: recipient.recipient_name,
          });

          await prisma.campaign_recipients.update({
            where: { id: recipient.id },
            data: { status: 'sent', sent_at: new Date() },
          });

          await prisma.campaigns.update({
            where: { id: campaignId },
            data: { sent_count: { increment: 1 }, updated_at: new Date() },
          });
        } catch (err) {
          console.error(`[CampaignQueue] Failed to send to ${recipient.email}:`, err.message);

          await prisma.campaign_recipients.update({
            where: { id: recipient.id },
            data: { status: 'failed', error_message: err.message?.substring(0, 500) },
          });

          await prisma.campaigns.update({
            where: { id: campaignId },
            data: { failed_count: { increment: 1 }, updated_at: new Date() },
          });
        }
      }

      // Emit progress update
      if (io) {
        const updated = await prisma.campaigns.findUnique({
          where: { id: campaignId },
          select: { sent_count: true, failed_count: true, total_recipients: true },
        });
        io.to(`tenant:${campaign.tenant_id}`).emit('campaign:progress', {
          campaignId,
          status: 'sending',
          ...updated,
        });
      }
    } catch (err) {
      console.error(`[CampaignQueue] Error processing campaign ${campaignId}:`, err.message);
    }
  }, 1000); // 1 tick per second

  activeQueues.set(campaignId, intervalId);
  console.log(`[CampaignQueue] Started campaign ${campaignId}`);
}

/**
 * Stop a campaign queue.
 */
function stopCampaignQueue(campaignId) {
  const intervalId = activeQueues.get(campaignId);
  if (intervalId) {
    clearInterval(intervalId);
    activeQueues.delete(campaignId);
    console.log(`[CampaignQueue] Stopped campaign ${campaignId}`);
  }
}

module.exports = { startCampaignQueue, stopCampaignQueue };
