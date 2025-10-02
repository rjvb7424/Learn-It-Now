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

type Props = {
  photoURL?: string | null;
  displayName?: string | null;
  onGoPurchases: () => void;
  onGoMyCourses: () => void;
  onGoAccount: () => void;
  onSignOut: () => void;
};

export default function ProfileMenu({
  photoURL,
  displayName,
  onGoPurchases,
  onGoMyCourses,
  onGoAccount,
  onSignOut,
}: Props) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleOpen = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  const go = (fn: () => void) => () => {
    handleClose();
    fn();
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
        <MenuItem onClick={go(onGoPurchases)}>
          <ListItemIcon><LibraryBooksIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Acquired courses</ListItemText>
        </MenuItem>

        <MenuItem onClick={go(onGoMyCourses)}>
          <ListItemIcon><EditNoteIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Edit created courses</ListItemText>
        </MenuItem>

        <MenuItem onClick={go(onGoAccount)}>
          <ListItemIcon><SettingsIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Account settings</ListItemText>
        </MenuItem>

        <Divider />

        <MenuItem onClick={go(onSignOut)}>
          <ListItemIcon><LogoutIcon fontSize="small" /></ListItemIcon>
          <ListItemText>Log out</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}
