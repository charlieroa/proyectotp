import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import logoLight from '@/assets/images/logo-light.png';

interface RegisterForm {
  business_name: string;
  owner_name: string;
  email: string;
  phone: string;
  password: string;
  password_confirm: string;
}

export default function RegisterTenantPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterForm>();

  const onSubmit = async (data: RegisterForm) => {
    setLoading(true);
    try {
      await api.post('/auth/register-tenant', {
        business_name: data.business_name,
        name: data.owner_name,
        email: data.email,
        phone: data.phone,
        password: data.password,
      });
      toast.success('Cuenta creada exitosamente. Inicia sesion.');
      navigate('/login');
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Error al crear la cuenta.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>
      <div className="absolute -left-32 -top-32 h-96 w-96 animate-pulse rounded-full bg-primary-600/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 animate-pulse rounded-full bg-purple-600/20 blur-3xl [animation-delay:2s]" />

      <div className="relative z-10 w-full max-w-md px-4">
        <div className="mb-8 text-center">
          <img src={logoLight} alt="Tupelukeria" className="mx-auto h-12" />
          <p className="mt-2 text-sm text-slate-400">Registra tu negocio</p>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-sm">
          <div className="mb-6 flex rounded-lg bg-slate-800 p-1">
            <Link
              to="/login"
              className="flex-1 rounded-md px-4 py-2 text-center text-sm font-medium text-slate-400 hover:text-white"
            >
              Iniciar Sesion
            </Link>
            <button className="flex-1 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white">
              Crear Cuenta
            </button>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-300">Nombre del negocio</label>
              <input
                {...register('business_name', { required: 'Requerido' })}
                placeholder="Mi Peluqueria"
                className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {errors.business_name && <p className="text-xs text-red-400">{errors.business_name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-300">Tu nombre</label>
              <input
                {...register('owner_name', { required: 'Requerido' })}
                placeholder="Juan Perez"
                className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {errors.owner_name && <p className="text-xs text-red-400">{errors.owner_name.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-300">Email</label>
              <input
                type="email"
                {...register('email', { required: 'Requerido' })}
                placeholder="tu@email.com"
                className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-300">Telefono</label>
              <input
                {...register('phone', { required: 'Requerido' })}
                placeholder="+57 300 123 4567"
                className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {errors.phone && <p className="text-xs text-red-400">{errors.phone.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-300">Contrasena</label>
              <input
                type="password"
                {...register('password', { required: 'Requerido', minLength: { value: 6, message: 'Minimo 6 caracteres' } })}
                placeholder="Minimo 6 caracteres"
                className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {errors.password && <p className="text-xs text-red-400">{errors.password.message}</p>}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-300">Confirmar contrasena</label>
              <input
                type="password"
                {...register('password_confirm', {
                  required: 'Requerido',
                  validate: (val) => val === watch('password') || 'Las contrasenas no coinciden',
                })}
                placeholder="Repite tu contrasena"
                className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {errors.password_confirm && <p className="text-xs text-red-400">{errors.password_confirm.message}</p>}
            </div>

            <Button type="submit" loading={loading} className="w-full" size="lg">
              Crear Cuenta
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
