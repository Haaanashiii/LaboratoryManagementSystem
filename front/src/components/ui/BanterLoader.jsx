import React from 'react';
import './BanterLoader.css';

/**
 * BanterLoader - Animated box loader component
 * From Uiverse.io by Nawsome
 * 
 * @param {Object} props
 * @param {string} props.className - Additional CSS classes
 * @param {Object} props.style - Custom inline styles
 */
const BanterLoader = ({ className = '', style = {} }) => {
  return (
    <div className={`banter-loader ${className}`} style={style}>
      <div className="banter-loader__box"></div>
      <div className="banter-loader__box"></div>
      <div className="banter-loader__box"></div>
      <div className="banter-loader__box"></div>
      <div className="banter-loader__box"></div>
      <div className="banter-loader__box"></div>
      <div className="banter-loader__box"></div>
      <div className="banter-loader__box"></div>
      <div className="banter-loader__box"></div>
    </div>
  );
};

export default BanterLoader;
