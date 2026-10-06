import { useEffect } from 'react';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../lib/auth';
import { DEFAULTS } from '../../lib/defaults';
import { PageHeader } from '../../components/ui';

/** Sign-in page. Accounts are created by invitation only, so there is no sign-up tab. */
export default function Login() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  useEffect(() => {
    if (auth.signedIn) navigate(params.get('next') ?? (auth.isStaff ? '/admin' : '/portal'), { replace: true });
  }, [auth.signedIn, auth.isStaff, navigate, params]);

  return (
    <>
      <PageHeader eyebrow="Members" title="Sign in" intro="For seminar students, alumni and staff. Accounts are issued by Prof. Sakurai or a seminar administrator." />
      <section className="section">
        <div className="container" style={{ maxWidth: 520 }}>
          <Authenticator hideSignUp loginMechanisms={['email']} />
          <p className="small muted" style={{ marginTop: 18 }}>
            First time? Use the email address and temporary password from your invitation email — you will be asked to choose your own password.
            Lost access? Write to <a href={`mailto:${DEFAULTS.contact.email}`}>{DEFAULTS.contact.email}</a>.
          </p>
        </div>
      </section>
    </>
  );
}
