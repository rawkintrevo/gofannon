import React from 'react';
import { Button, Card, CardActions, CardContent, Typography } from '@mui/material';
import { Link } from 'react-router-dom';

const EchoCard = () => {
  return (
    <Card>
      <CardContent>
        <Typography variant="h5" component="div">
          Echo Extension
        </Typography>
        <Typography sx={{ mt: 1.5 }} color="text.secondary">
          An example of a custom card that links to a new page and API.
        </Typography>
      </CardContent>
      <CardActions>
        <Button component={Link} to="/echo" size="small">
          Try It
        </Button>
      </CardActions>
    </Card>
  );
};

export default EchoCard;