import React from 'react';
import '../styles/card.css';

const Card = ({ title, description, buttonText = 'Get Started', onButtonClick }) => {
  return (
    <div className="stitch-card">
      <div className="stitch-card__glow" />
      <div className="stitch-card__content">
        <h3 className="stitch-card__title">{title}</h3>
        <p className="stitch-card__description">{description}</p>
        <button className="stitch-card__button" onClick={onButtonClick}>
          {buttonText}
          <span className="stitch-card__button-shine" />
        </button>
      </div>
    </div>
  );
};

export default Card;
