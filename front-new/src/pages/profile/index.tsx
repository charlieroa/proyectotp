import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { User } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar } from '@/components/ui/avatar';
import { useAuth } from '@/hooks/use-auth';
import { useUpdateUser } from '@/api/users';

interface ProfileForm {
  name: string;
  email: string;
  phone: string;
}

export default function ProfilePage() {
  const { user } = useAuth();
  const updateUser = useUpdateUser();
  const { register, handleSubmit } = useForm<ProfileForm>({
    defaultValues: {
      name: user?.name ?? '',
      email: user?.email ?? '',
      phone: (user as unknown as Record<string, unknown>)?.phone as string ?? '',
    },
  });

  const onSubmit = async (data: ProfileForm) => {
    if (!user?.id) return;
    try {
      await updateUser.mutateAsync({ id: user.id, ...data });
      toast.success('Perfil actualizado');
    } catch {
      toast.error('Error al actualizar perfil');
    }
  };

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Mi Perfil</h1>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informacion Personal
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-6 flex items-center gap-4">
            <Avatar name={user?.name ?? 'U'} size="lg" />
            <div>
              <p className="font-medium">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input label="Nombre" {...register('name')} />
            <Input label="Email" type="email" {...register('email')} />
            <Input label="Telefono" {...register('phone')} />
            <Button type="submit" loading={updateUser.isPending}>
              Guardar Cambios
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
