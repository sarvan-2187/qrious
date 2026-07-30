import React from 'react';
import GatesPlaygroundPage from '../pages/GatesPlaygroundPage';

interface GatesPlaygroundProps {
  initialQasm?: string;
  isEmbedded?: boolean;
}

export const GatesPlayground: React.FC<GatesPlaygroundProps> = ({ initialQasm, isEmbedded = true }) => {
  return <GatesPlaygroundPage initialQasm={initialQasm} isEmbedded={isEmbedded} />;
};

export default GatesPlayground;
