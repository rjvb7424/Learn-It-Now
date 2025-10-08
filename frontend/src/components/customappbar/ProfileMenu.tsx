// src/components/customappbar/ProfileMenu.tsx
import { useState } from "react";
import {
  Avatar, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Divider,
} from "@mui/material";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import EditNoteIcon from "@mui/icons-material/EditNote";
import LogoutIcon from "@mui/icons-material/Logout";
import AccountBalanceWalletIcon from "@mui/icons-material/AccountBalanceWallet";
import FeedbackOutlinedIcon from "@mui/icons-material/FeedbackOutlined";
import FlagOutlinedIcon from "@mui/icons-material/FlagOutlined";
import GavelOutlinedIcon from "@mui/icons-material/GavelOutlined";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase";
import { useAuthProfile } from "../../hooks/useAuthProfile";

type Props = {
  photoURL?: string | null;
  displayName?: string | null;
};

const CREATE_LOGIN_LINK_URL = "https://createstripeloginlink-5rf4ii6yvq-uc.a.run.app";

const FEEDBACK_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScqPd9-gHCOEsQk26eLUt0NrMMDC0PkoRu-eV-Eg8G2x-utBw/viewform?usp=header";
const REPORT_FORM_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLScIb7u1_414psQ47AJEKQM1VKj1rI8mp24SY_iB2t4_yd_cGw/viewform?usp=header";

export default function ProfileMenu({ photoURL, displayName }: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [dashLoading, setDashLoading] = useState(false);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  const { firebaseUser, stripeAccountId, stripeOnboarded } = useAuthProfile();

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const go = (path: string) => () => { handleClose(); navigate(path); };
  const handleSignOut = async () => { handleClose(); await signOut(auth); navigate("/"); };

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
        body: JSON.stringify({ uid: firebaseUser.uid, origin: window.location.origin }),
      });
      interface StripeLoginLinkResponse {
        url?: string;
        error?: string;
      }
      const data: StripeLoginLinkResponse = await res.json().catch(() => ({} as StripeLoginLinkResponse));
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

  const openExternal = (url: string) => () => {
    handleClose();
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const menuId = "profile-menu";

  return (
    <>
      <IconButton
        onClick={handleOpen}
        aria-controls={open ? menuId : undefined}
        aria-haspopup="menu"
        aria-expanded={open ? "true" : undefined}
      >
        <Avatar
          src={photoURL ?? undefined}
          alt={displayName ?? "User"}
          imgProps={{ referrerPolicy: "no-referrer", loading: "lazy" }}
          onError={(e) => { (e.currentTarget as HTMLImageElement).src = ""; }}
        />
      </IconButton>

      <Menu
        id={menuId}
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
        transformOrigin={{ vertical: "top", horizontal: "right" }}
        keepMounted
      >
        {stripeOnboarded && stripeAccountId
          ? [
              <MenuItem key="stripe-dash" onClick={openStripeDashboard} disabled={dashLoading}>
                <ListItemIcon><AccountBalanceWalletIcon fontSize="small" /></ListItemIcon>
                <ListItemText>{dashLoading ? "Opening…" : "Stripe Dashboard"}</ListItemText>
              </MenuItem>,
              <Divider key="stripe-div" />
            ]
          : null}

        <MenuItem onClick={go("/purchases")}>
          <ListItemIcon><LibraryBooksIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Purchased courses</ListItemText>
        </MenuItem>

        <MenuItem onClick={go("/my-courses")}>
          <ListItemIcon><EditNoteIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Created courses</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={openExternal(FEEDBACK_FORM_URL)}>
          <ListItemIcon><FeedbackOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Feedback &amp; feature requests</ListItemText>
        </MenuItem>

        <MenuItem onClick={openExternal(REPORT_FORM_URL)}>
          <ListItemIcon><FlagOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Report a course</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={go("/terms")}>
          <ListItemIcon><GavelOutlinedIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Terms of Service</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={handleSignOut}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Log out</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}