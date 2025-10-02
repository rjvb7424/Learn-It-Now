import { Avatar, IconButton } from "@mui/material";

type Props = {
  photoURL?: string | null;
  displayName?: string | null;
  onClick: () => void;
};

export default function UserAvatarButton({ photoURL, displayName, onClick }: Props) {
  return (
    <IconButton onClick={onClick}>
      <Avatar
        src={photoURL ?? undefined}
        imgProps={{ referrerPolicy: "no-referrer", loading: "lazy" }}
        alt={displayName ?? "User"}
        onError={(e) => { (e.currentTarget as HTMLImageElement).src = ""; }}
      />
    </IconButton>
  );
}
