import React from 'react';
import { Grid, Button, Spinner } from 'react-mdl';
import PropTypes from 'prop-types';
import PhotoGridItem from './PhotoGridItem';

import '../css/PhotoGrid.css';

const PhotoGrid = (props) => {
  const {
    photos,
    requestForMorePhotos,
    areThereMoreResults,
    isLoading,
    handleSaveToDropbox
  } = props;

  const images = photos.map((imageData, index) => <PhotoGridItem dropbox={props.dropbox} imageData={imageData} key={index} handleSaveToDropbox={handleSaveToDropbox} />);

  return (
    <div className="photo-grid">
      <Grid>
        {images}
        { (areThereMoreResults)
          ? <div className="clearfix">
              <Button
                raised
                colored
                onClick={requestForMorePhotos}
                className="load-more-photos"
                disabled={isLoading}
              >
                Load More
              </Button>
              { (isLoading) ? <Spinner className="loading-spinner" /> : "" }
            </div>

          : ""
        }

      </Grid>
      <span className="credit">
        Made with <a href="https://unsplash.com/">Unsplash</a>
      </span>
    </div>
  );
}

PhotoGrid.propTypes = {
  photos: PropTypes.array
}

export default PhotoGrid;
