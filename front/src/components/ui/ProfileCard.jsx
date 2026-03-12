import React from 'react';
import { Lock } from 'lucide-react';
import './ProfileCard.css';
import backgroundImg from '@/assets/images/Equimon Logo.png';

/**
 * ProfileCard - User profile card component with image background
 * 
 * @param {Object} props
 * @param {string} props.name - User's full name
 * @param {string} props.role - User's role/position
 * @param {string} props.avatar - User's avatar initial(s)
 * @param {boolean} props.showBadge - Whether to show the security badge
 * @param {string} props.badgeText - Text for the security badge (default: "SECURE ACCESS")
 * @param {string} props.className - Additional CSS classes
 */
const ProfileCard = ({ 
  name = 'Cameron Williamson', 
  role = 'Web Development', 
  avatar = 'C',
  showBadge = false,
  badgeText = 'SECURE ACCESS',
  className = '' 
}) => {
  return (
    <div className={`profile-card ${className}`}>
      {/* Background Header with Image */}
      <div className="profile-card__img">
        <img src={backgroundImg} alt="Background" className="profile-card__bg-image" />
        
        {showBadge && (
          <div className="profile-card__badge">
            <Lock size={14} />
            <span>{badgeText}</span>
          </div>
        )}
      </div>
      
      {/* Avatar */}
      <div className="profile-card__avatar">
        <div className="profile-card__avatar-circle">
          {avatar}
        </div>
      </div>
      
      {/* User Info */}
      <div className="profile-card__title">{name}</div>
      <div className="profile-card__subtitle">{role}</div>
    </div>
  );
};

export default ProfileCard;
