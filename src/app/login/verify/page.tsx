import VerifyClient from './VerifyClient';

export const metadata = { title: 'Confirm sign-in' };

export default function VerifyPage({ searchParams }: { searchParams: { token?: string } }) {
  return <VerifyClient token={searchParams.token ?? ''} />;
}
