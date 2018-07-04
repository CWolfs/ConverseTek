import React from 'react';
import PropTypes from 'prop-types';

const ViewablePreset = ({ preset }) => {
  return (
    <div>
      {preset.Label}
    </div>
  );
};

ViewablePreset.propTypes = {
  preset: PropTypes.object.isRequired,
}

export default ViewablePreset;
