import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { getDashboardForRole } from '../../navigation/roleScreens';

/**
 * Menu tab = just the role dashboard itself (Manage/Reports cards etc,
 * whatever getDashboardForRole renders for this user's role). There is no
 * separate "Dashboard" page to tap into anymore - everything lives on this
 * one screen. The profile card (avatar/name/email/role) has been removed.
 *
 * Log Out no longer lives here - it moved to AccountSettingsScreen (one
 * entry point for every role instead of a footer card appended under each
 * dashboard), reachable via each dashboard's own Settings tile.
 * Accessibility (display size) lives in Account Settings too.
 */
export default function MenuScreen() {
  const { user } = useAuth();

  if (!user) return null;

  return getDashboardForRole(user.role);
}
