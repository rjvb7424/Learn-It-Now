// src/pages/TermsOfService.tsx
import { Container, Typography, List, ListItem, ListItemText, Divider, Box } from "@mui/material";
import CustomAppBar from "./components/customappbar/CustomAppBar";
import PageHeader from "./components/PageHeader";

export default function TermsOfService() {
  return (
    <Box>
        <CustomAppBar showSearch={false} />
      <Container>
        <PageHeader
          title="Terms of Service"
          subtitle="By using this service, you agree to the following terms:"
        />
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Last updated: 5th of October 2025
        </Typography>

        <Typography variant="h6" sx={{ mt: 3 }}>1) Using Courses</Typography>
        <List dense>
          <ListItem><ListItemText primary="You must be 18+ and provide accurate information about your profile." /></ListItem>
          <ListItem><ListItemText primary="You are responsible for your account's security and activity." /></ListItem>
        </List>

        <Typography variant="h6" sx={{ mt: 3 }}>2) What’s not allowed</Typography>
        <List dense>
          <ListItem><ListItemText primary="Offensive, hateful, harassing, or extremist content." /></ListItem>
          <ListItem><ListItemText primary="Sexual content or nudity. Any content involving minors." /></ListItem>
          <ListItem><ListItemText primary="Illegal, dangerous, or harmful activities/instructions." /></ListItem>
          <ListItem><ListItemText primary="Scams, fraud, deceptive claims, spam, or fake engagement." /></ListItem>
          <ListItem><ListItemText primary="Plagiarism, copyright/trademark or privacy violations (e.g., doxxing)." /></ListItem>
          <ListItem><ListItemText primary="Malware, phishing, or attempts to break security." /></ListItem>
        </List>

        <Typography variant="h6" sx={{ mt: 3 }}>3) Course quality & honesty</Typography>
        <List dense>
          <ListItem><ListItemText primary="Describe courses truthfully. Don’t manipulate reviews/ratings." /></ListItem>
        </List>

        <Typography variant="h6" sx={{ mt: 3 }}>4) Your content</Typography>
        <List dense>
          <ListItem><ListItemText primary="You retain ownership but grant us a license to host and display your content on Courses." /></ListItem>
          <ListItem><ListItemText primary="Only upload content you have rights to." /></ListItem>
        </List>

        <Typography variant="h6" sx={{ mt: 3 }}>5) Enforcement</Typography>
        <List dense>
          <ListItem><ListItemText primary="We may remove content or suspend/terminate accounts for violations—especially severe or repeated ones." /></ListItem>
        </List>

        <Typography variant="h6" sx={{ mt: 3 }}>6) Disclaimers & changes</Typography>
        <List dense>
          <ListItem><ListItemText primary="Service provided “as is.” We may update these terms; continued use means you accept the changes." /></ListItem>
        </List>

        <Typography variant="h6" sx={{ mt: 3 }}>7) Refunds</Typography>
        <List dense>
          <ListItem>
            <ListItemText
              primary="For the time being, purchases are non-refundable. Please review course details carefully before buying."
            />
          </ListItem>
        </List>

        <Divider sx={{ my: 3 }} />
        <Typography variant="body2" color="text.secondary">
          This is a simple, non-legal summary. For full protection, consult a lawyer and host a Privacy Policy.
        </Typography>
      </Container>
    </Box>
  );
}
