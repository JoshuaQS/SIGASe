import { ArrowRight, Shield } from 'lucide-react';
import { Button } from '@/components/ui/Button';

interface StudentAccessAlternateProps {
  onSwitchToAdmin?: () => void;
}

export default function StudentAccessAlternate({
  onSwitchToAdmin,
}: StudentAccessAlternateProps) {
  return (
    <Button
      variant="outline"
      className="h-11 w-full"
      onClick={onSwitchToAdmin}
    >
      <Shield className="h-4 w-4" />
      Ingresar como administrador
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
}