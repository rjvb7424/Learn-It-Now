// src/components/customappbar/ProfileMenu.tsx
import { useState } from "react";
import {
  Avatar, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider,
} from "@mui/material";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import EditNoteIcon from "@mui/icons-material/EditNote";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import { useAuthProfile } from "../../hooks/useAuthProfile";

type Props = {
  photoURL?: string | null;
  displayName?: string | null;
};

const CREATE_LOGIN_LINK_URL = "https://createstripeloginlink-5rf4ii6yvq-uc.a.run.app"

export default function ProfileMenu({ photoURL, displayName }: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  // get uid + stripe status
  const { firebaseUser, stripeAccountId, stripeOnboarded } = useAuthProfile();

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const go = (path: string) => () => {
    handleClose();
    navigate(path);
  };

  const handleSignOut = async () => {
    handleClose();
    await signOut(auth);
    navigate("/");
  };

  const openStripeDashboard = async () => {
    if (!firebaseUser || !stripeOnboarded || !stripeAccountId) return;
    if (!CREATE_LOGIN_LINK_URL) {
      alert("Stripe dashboard link is not configured. Set VITE_CREATE_STRIPE_LOGIN_LINK_URL.");
      return;
    }
    try {
      setDashLoading(true);
      const res = await fetch(CREATE_LOGIN_LINK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          uid: firebaseUser.uid,
          // you could send accountId as well, server verifies it matches
          origin: window.location.origin,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.url) throw new Error(data?.error || "Failed to create login link");
      handleClose();
      window.location.assign(data.url as string);
    } catch (e: unknown) {
      console.error(e);
      alert((e as Error)?.message || "Could not open Stripe Dashboard");
    } finally {
      setDashLoading(false);
    }
  };

  return (
    <>
      <IconButton onClick={handleOpen}>
        <Avatar
          src={photoURL ?? undefined}
          alt={displayName ?? "User"}
          imgProps={{ referrerPolicy: "no-referrer", loading: "lazy" }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = ""; }}
        />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <MenuItem onClick={go("/purchases")}>
          <ListItemIcon><LibraryBooksIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Acquired courses</ListItemText>
        </MenuItem>

        <MenuItem onClick={go("/my-courses")}>
          <ListItemIcon><EditNoteIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit created courses</ListItemText>
        </MenuItem>

        {/* ✅ Only show if onboarded */}
        {stripeOnboarded && stripeAccountId && (
          <MenuItem onClick={openStripeDashboard} disabled={dashLoading}>
            <ListItemIcon><AccountBalanceWalletIcon fontSize="small" /></ListItemIcon>
            <ListItemText>{dashLoading ? "Opening…" : "Stripe Dashboard"}</ListItemText>
          </MenuItem>
        )}

        <Divider />

        <MenuItem onClick={handleSignOut}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Log out</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
