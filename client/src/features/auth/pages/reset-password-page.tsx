import { useLocation, useNavigate } from 'react-router-dom';
import RecoveryCard from '@/features/auth/components/recovery-card';

type ResetLocationState = {
  mode?: 'student' | 'admin';
};

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const token = params.get('token');
  const queryMode = params.get('mode');
  const stateMode = (location.state as ResetLocationState | null)?.mode;
  const audience = queryMode === 'admin' || stateMode === 'admin' ? 'admin' : 'student';

  return (
    <RecoveryCard
      mode="reset"
      audience={audience}
      token={token}
      onBackToLogin={() =>
        navigate('/login', { state: { mode: audience } })
      }
    />
  );
}
