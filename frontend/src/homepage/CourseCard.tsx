import { Avatar, Card, CardActions, CardContent, CardHeader, CardMedia, IconButton, Typography, Button } from "@mui/material";
import { Favorite, Share } from '@mui/icons-material';

export default function CourseCard() {
  return(
    <Card>
        <CardHeader 
        avatar={<Avatar>JD</Avatar>} 
        title="John Doe"
        subtitle="September 14, 2021"/>
        
        <CardMedia
        sx={{ aspectRatio: "16:9" }}
        color="primary"/>

        <CardContent>
            <Typography variant="h6">
                Python Coding for Absolute Beginners
            </Typography>
            <Typography variant="body2">
                Learn Python from scratch and become a proficient programmer with our comprehensive course designed for absolute beginners. Start your coding journey today!
            </Typography>
        </CardContent>

        <CardActions disableSpacing>
            <Typography>
                13K
            </Typography>
            <IconButton>
                <Favorite />
            </IconButton>
            <IconButton>
                <Share />
            </IconButton>
            <Button>
                Learn It Now!
            </Button>
        </CardActions>
    </Card>
  );
}