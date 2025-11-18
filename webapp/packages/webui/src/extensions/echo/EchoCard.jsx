// webapp/packages/webui/src/extensions/echo/EchoCard.jsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import ActionCard from '../../components/ActionCard';
import CampaignIcon from '@mui/icons-material/Campaign';

const EchoCard = () => {
    const navigate = useNavigate();

    return (
        <ActionCard
            icon={<CampaignIcon />}
            title="Echo Chamber"
            description="A simple page that echoes back what you type. A demonstration of the extension system."
            buttonText="Go"
            onClick={() => navigate('/echo')}
        />
    );
};

export default EchoCard;
