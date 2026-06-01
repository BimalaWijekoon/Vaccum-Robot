import React from 'react';
import MissionPanel from './MissionPanel';
import AiDecisions from './AiDecisions';
import TeachPanel from './TeachPanel';

const ActivityPanel = () => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', height: '100%' }}>
      <MissionPanel />
      <AiDecisions />
      <TeachPanel />
    </div>
  );
};

export default ActivityPanel;
