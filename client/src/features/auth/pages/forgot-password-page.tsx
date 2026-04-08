import RecoveryCard from '@/features/auth/components/recovery-card';
import { useLocation, useNavigate } from 'react-router-dom';

type ForgotLocationState = {
  returnLoginMode?: 'student' | 'admin';
};

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const returnLoginMode =
    (location.state as ForgotLocationState | null)?.returnLoginMode ?? 'student';

  return (
    <RecoveryCard
      mode="request"
      audience={returnLoginMode === 'admin' ? 'admin' : 'student'}
      emailPlaceholder={
        returnLoginMode === 'admin'
          ? 'admin@utez.edu.mx'
          : 'estudiante@utez.edu.mx'
      }
      onBackToLogin={() =>
        navigate('/login', { state: { mode: returnLoginMode } })
      }
    />
  );
}
