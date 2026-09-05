import Login from '@/components/shadcn-studio/blocks/login-page-04/login-page-04';

export const LoginView = ({ onLoginSuccess }: { onLoginSuccess?: (role: string) => void }) => {
  return <Login onLoginSuccess={onLoginSuccess} />;
};

export default LoginView;
