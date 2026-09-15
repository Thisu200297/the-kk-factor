import { useCallback, useState } from 'react';
import Icon from '../common/Icon';
import { Spinner } from '../common/Loader';
import { useFetch } from '../../hooks/useFetch';
import { remindersApi } from '../../utils/api';

/**
 * "Email me before the show."
 *
 * Sits beside the calendar button rather than instead of it. The calendar
 * entry reaches everyone and asks for nothing; this reaches the people who
 * would rather be told, including the ones on iPhones, who cannot have a
 * browser notification unless they first add the site to their home screen.
 *
 * The box is closed until somebody opens it. An email field sitting open on a
 * page is a small tax on everyone who did not want one, and this one only
 * exists for the minority who do.
 *
 * Nothing happens to an address until the person who owns it clicks the link
 * in a confirmation email — which is both what the Spam Act asks of an
 * Australian sender and the only reason it is safe to have a box like this at
 * all: otherwise anybody could put anybody's address in it.
 */
export default function ReminderSignup() {
  const fetcher = useCallback(() => remindersApi.status(), []);
  const { data } = useFetch(fetcher);

  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | sending | sent | error
  const [error, setError] = useState(null);

  // The list is not open until the client has connected a mail service. Until
  // then, saying nothing is better than a box that fails when it is used.
  if (!data?.available) return null;

  const submit = async (event) => {
    event.preventDefault();
    setError(null);
    setState('sending');
    try {
      await remindersApi.subscribe(email.trim());
      setState('sent');
    } catch (err) {
      setError(err.message);
      setState('error');
    }
  };

  if (state === 'sent') {
    return (
      <p className="flex items-start gap-2 rounded-panel border border-primary/25 bg-primary-soft/40 px-4 py-3 text-sm text-fg">
        <Icon name="check_circle" size={18} className="mt-0.5 shrink-0 text-primary" />
        <span>
          Check your email — there is a link to confirm. Nothing is sent until you click it.
        </span>
      </p>
    );
  }

  if (!open) {
    return (
      <button type="button" className="btn-ghost" onClick={() => setOpen(true)}>
        <Icon name="email" size={17} />
        Email me before the show
      </button>
    );
  }

  return (
    <form onSubmit={submit} className="w-full">
      <label className="label" htmlFor="reminder-email">
        Email me before the show
      </label>

      <div className="flex flex-wrap gap-2">
        <input
          id="reminder-email"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="input min-w-0 flex-1"
        />
        <button type="submit" className="btn-primary" disabled={state === 'sending'}>
          {state === 'sending' ? <Spinner size={16} /> : <Icon name="email" size={17} />}
          {state === 'sending' ? 'Sending…' : 'Remind me'}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-danger">{error}</p>}

      <p className="mt-2 text-xs text-fg-subtle">
        One message an hour before the show, nothing else. Every message has an unsubscribe link,
        and the address is not used for anything else.
      </p>
    </form>
  );
}
