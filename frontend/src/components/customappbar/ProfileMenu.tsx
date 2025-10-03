import { useState } from "react";
import {
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
} from "@mui/material";
import LibraryBooksIcon from "@mui/icons-material/LibraryBooks";
import EditNoteIcon from "@mui/icons-material/EditNote";
import SettingsIcon from "@mui/icons-material/Settings";
import LogoutIcon from "@mui/icons-material/Logout";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase/firebase"; // adjust path if needed

type Props = {
  photoURL?: string | null;
  displayName?: string | null;
};

export default function ProfileMenu({ photoURL, displayName }: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  const navigate = useNavigate();

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const go = (path: string) => () => {
    handleClose();
    navigate(path);
  };

  const handleSignOut = async () => {
    handleClose();
    await signOut(auth);
    navigate("/"); // back to home after logout
  };

  return (
    <>
      <IconButton onClick={handleOpen}>
        <Avatar
          src={photoURL ?? undefined}
          alt={displayName ?? "User"}
          imgProps={{ referrerPolicy: "no-referrer", loading: "lazy" }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "";
          }}
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

        <MenuItem onClick={go("/account")}>
          <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Account settings</ListItemText>
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
