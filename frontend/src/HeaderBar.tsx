// src/components/HeaderBar.tsx
import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Avatar from "@mui/material/Avatar";
import IconButton from "@mui/material/IconButton";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Box from "@mui/material/Box";
import { useAuth } from "./authentication/AuthContext";
import { signInWithGoogleRedirect, signOut } from "../firebase";

export default function HeaderBar() {
  const { user, loading } = useAuth();
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);

  const open = Boolean(anchorEl);
  const handleMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);

  return (
    <AppBar position="sticky" sx={{ minHeight: 60 }}>
      <Toolbar sx={{ gap: 2 }}>
        <Typography variant="h6" sx={{ flexGrow: 1 }}>
          Your App
        </Typography>

        {!loading && !user && (
          <Button
            variant="contained"
            color="inherit"
            onClick={signInWithGoogleRedirect}
          >
            Sign in
          </Button>
        )}

        {!loading && user && (
          <Box>
            <IconButton onClick={handleMenu} size="small" sx={{ p: 0 }}>
              <Avatar
                src={user.photoURL ?? undefined}
                alt={user.displayName ?? "User"}
                sx={{ width: 36, height: 36 }}
              />
            </IconButton>
            <Menu open={open} onClose={handleClose} anchorEl={anchorEl}>
              <MenuItem disabled>
                {user.displayName || user.email}
              </MenuItem>
              <MenuItem
                onClick={async () => {
                  handleClose();
                  await signOut();
                }}
              >
                Sign out
              </MenuItem>
            </Menu>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
}
