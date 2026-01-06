// webapp/packages/webui/src/components/AnvilIcon.jsx
import React from 'react';
import PropTypes from 'prop-types';

/**
 * Anvil icon from Noun Project - adapted for React
 * Use color="white" for dark backgrounds, color="#18181b" for light backgrounds
 */
const AnvilIcon = ({ size = 24, color = 'currentColor' }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 100 100" 
    fill={color}
  >
    <path d="m 92.676,34.299 v 5.946 h -5.707 l -8.735,7.469 h -2.513 c -4.273,0 -8.099,2.376 -8.476,6.414 -0.001,0.233 -0.001,-0.058 -0.001,0.173 0,2.891 1.432,5.444 3.623,6.999 l 9.511,4.841 c 0.666,0.78 0.607,1.415 0.607,1.415 v 4.815 H 70.5 l -1.614,-1.702 h -27.34 l -1.614,1.702 H 29.446 v -4.815 c 0,0 -0.058,-0.635 0.607,-1.415 l 8.981,-4.865 h 0.002 c 1.971,-1.121 3.304,-3.234 3.304,-5.663 0,-4.502 -4.008,-6.558 -8.509,-6.558 L 29.71,49.054 29.706,46.895 C 6.994,46.666 2.643,33.87 2.643,33.87 2.549,33.731 2.495,33.564 2.495,33.385 c 0,-0.48 0.389,-0.869 0.869,-0.869 0.04,0 9.176,0.036 9.176,0.036 h 10.745 v -1.484 l 6.546,0.002 v -2.684 l 54.295,0.078 z" />
  </svg>
);

AnvilIcon.propTypes = {
  size: PropTypes.number,
  color: PropTypes.string,
};

export default AnvilIcon;