import React, { useState } from 'react';
import { signIn } from '../services/auth-session.service';
import PasswordInput from './auth/PasswordInput';
import { supportUrl } from '../config/support';
import { FirebaseError } from 'firebase/app';
import { motion } from 'motion/react';
import { Lock, Mail, Loader2 } from 'lucide-react';
import { useFeedback } from '../hooks';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const feedback = useFeedback();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await signIn(email, password);
      feedback.success('Bem-vindo!');
    } catch (error) {
      const code = error instanceof FirebaseError ? error.code : (typeof error === 'object' && error && 'code' in error ? String(error.code) : '');
      if (code === 'auth/user-disabled') feedback.error('Este acesso está desativado. Fale com a agência.');
      else if (code === 'auth/too-many-requests') feedback.error('Muitas tentativas. Aguarde alguns minutos.');
      else if (code === 'auth/network-request-failed') feedback.error('Não foi possível conectar. Tente novamente.');
      else if (['auth/invalid-credential', 'auth/wrong-password', 'auth/user-not-found', 'auth/invalid-email'].includes(code)) feedback.error('E-mail ou senha inválidos.');
      else feedback.error('Não foi possível entrar. Tente novamente ou fale com o suporte.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD] p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-zinc-200 p-10 rounded-3xl shadow-sm"
      >
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tighter mb-3">TS Agency</h1>
          <p className="text-zinc-400 text-sm italic serif">Sua agência de marketing em um só lugar.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-2 font-bold">Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
              <input 
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full bg-[#FAFAFA] border border-zinc-200 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-black transition-all"
                placeholder="seu@email.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.2em] text-zinc-400 mb-2 font-bold">Senha</label>
            <div className="relative">
              <Lock className="pointer-events-none z-10 absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-300" />
              <PasswordInput
                aria-label="Senha"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                className="w-full bg-[#FAFAFA] border border-zinc-200 rounded-2xl py-4 pl-12 pr-4 text-sm focus:outline-none focus:border-black transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button 
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white font-bold py-4 rounded-2xl hover:bg-zinc-800 transition-all flex items-center justify-center gap-3 shadow-lg shadow-black/5"
          >
            {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Entrar na Plataforma'}
          </button>
          <a href={supportUrl('recovery')} target="_blank" rel="noopener noreferrer" className="flex min-h-11 items-center justify-center text-sm font-bold underline">Esqueci minha senha</a>
        </form>

        <div className="mt-10 pt-8 border-t border-zinc-100 text-center">
          <p className="text-zinc-300 text-[10px] uppercase tracking-[0.3em] font-bold">Portal TS Agency</p>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
