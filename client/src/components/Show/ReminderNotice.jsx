import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useToast } from '../common/Toast';

/**
 * What the reader sees after clicking a link in a reminder email.
 *
 * Confirming and unsubscribing happen on the server — they have to, because
 * the reader is coming from their inbox with nothing but a token, and may not
 * have this site open at all. The server does the work and sends them back
 * here with `?reminders=…`, which is the only thing this reads.
 *
 * The parameter is then taken out of the address, so a refresh or a shared
 * link does not announce it again to somebody it never happened to.
 */
const MESSAGES = {
  confirmed: {
    type: 'success',
    text: 'You are on the list. I will email you before the show.',
  },
  unsubscribed: {
    type: 'success',
    text: 'Unsubscribed. You will not get any more reminders.',
  },
  invalid: {
    type: 'error',
    text: 'That link has already been used, or it has expired.',
  },
};

export default function ReminderNotice() {
  const location = useLocation();
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const state = params.get('reminders');
    if (!state) return;

    const message = MESSAGES[state];
    if (message) toast[message.type](message.text);

    params.delete('reminders');
    const query = params.toString();
    navigate({ pathname: location.pathname, search: query ? `?${query}` : '' }, { replace: true });
  }, [location.search, location.pathname, navigate, toast]);

  return null;
}
