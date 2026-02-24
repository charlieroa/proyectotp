import { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import logoLight from '@/assets/images/logo-light.png';

interface LoginForm {
  email: string;
  password: string;
}

export default function LoginPage() {
  const { login, token, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  if (token) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string; error?: string } } })?.response?.data
          ?.message ||
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        (err as Error)?.message ||
        'No se pudo iniciar sesion.';
      toast.error(msg);
    }
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
      {/* Animated background */}
      <div className="absolute inset-0 opacity-20">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#1f2937_1px,transparent_1px),linear-gradient(to_bottom,#1f2937_1px,transparent_1px)] bg-[size:4rem_4rem]" />
      </div>
      <div className="absolute -left-32 -top-32 h-96 w-96 animate-pulse rounded-full bg-primary-600/20 blur-3xl" />
      <div className="absolute -bottom-32 -right-32 h-96 w-96 animate-pulse rounded-full bg-purple-600/20 blur-3xl [animation-delay:2s]" />

      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="mb-8 text-center">
          <img src={logoLight} alt="Tupelukeria" className="mx-auto h-12" />
          <p className="mt-2 text-sm text-slate-400">
            Ahora la IA en tu pelukeria
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-sm">
          {/* Tabs */}
          <div className="mb-6 flex rounded-lg bg-slate-800 p-1">
            <button className="flex-1 rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white">
              Iniciar Sesion
            </button>
            <Link
              to="/register-tenant"
              className="flex-1 rounded-md px-4 py-2 text-center text-sm font-medium text-slate-400 hover:text-white"
            >
              Crear Cuenta
            </Link>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-300">
                Email
              </label>
              <input
                type="email"
                {...register('email', {
                  required: 'El email es requerido',
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Email no valido',
                  },
                })}
                placeholder="tu@email.com"
                className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-slate-300">
                Contrasena
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: 'La contrasena es requerida',
                    minLength: { value: 4, message: 'Minimo 4 caracteres' },
                  })}
                  placeholder="Tu contrasena"
                  className="block w-full rounded-lg border border-slate-700 bg-slate-800 px-4 py-2.5 pr-10 text-sm text-white placeholder:text-slate-500 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            <Button
              type="submit"
              loading={isLoading}
              className="w-full"
              size="lg"
            >
              Iniciar Sesion
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
