import { useCallback, useState } from 'react';
import Icon from '../common/Icon';
import Modal from '../common/Modal';
import Plans from './Plans';
import { useFetch } from '../../hooks/useFetch';
import { useAuth } from '../../hooks/useAuth';
import { membershipApi } from '../../utils/api';

/**
 * "Subscribe" in the top bar, and the membership levels in a dialog behind it.
 *
 * The levels used to sit at the bottom of the show page, where a reader only
 * met them if they had already scrolled past the whole archive. Moving them
 * behind a button in the bar puts them one click from every page instead —
 * which is what a subscription offer is for.
 *
 * WHO SEES IT. Anyone who is not already a member: signed out, or signed in on
 * the free tier. Showing "Subscribe" to somebody who has subscribed is the
 * kind of small rudeness that makes a site feel like it is not paying
 * attention, so premium members and administrators do not get it.
 *
 * WHY IT ASKS THE SERVER BEFORE DRAWING ANYTHING. Membership can be switched
 * off entirely from the dashboard. If it is off, this button has nothing
 * behind it, so it does not appear at all rather than opening an empty dialog.
 */
export default function SubscribeButton({ className = '', onNavigate }) {
  const [open, setOpen] = useState(false);
  const { user } = useAuth();

  const fetcher = useCallback(() => membershipApi.get(), []);
  const { data } = useFetch(fetcher);

  const membership = data?.membership;
  const alreadyAMember = user?.tier === 'premium' || user?.role === 'admin';

  if (!membership?.enabled || !membership.plans?.length || alreadyAMember) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          // Closes the mobile menu behind the dialog, so dismissing the dialog
          // does not reveal a menu the reader had forgotten was open.
          if (onNavigate) onNavigate();
        }}
        className={className || 'btn-primary'}
      >
        <Icon name="workspace_premium" size={16} />
        Subscribe
      </button>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={membership.heading || 'Membership'}
        size="lg"
      >
        {/* The dialog supplies the heading, so the panel inside does not. */}
        <Plans compact />
      </Modal>
    </>
  );
}
