import { Container } from "@mui/material";
import CourseCard from "./CourseCard";
import SignInButton from "./SignInButton";

export default function HomePage() {
  return (
    <Container>
      <CourseCard />
      <SignInButton />
    </Container>
  );
}
