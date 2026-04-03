import { LoginScreen } from '@/components/auth/LoginScreen';

interface LoginPageProps {
  searchParams?: {
    next?: string;
  };
}

export default function LoginPage({ searchParams }: LoginPageProps) {
  const nextPath = typeof searchParams?.next === 'string' ? searchParams.next : null;
  return <LoginScreen nextPath={nextPath} />;
}
