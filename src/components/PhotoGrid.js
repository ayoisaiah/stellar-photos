import React from 'react';
import { Grid, Button, Spinner } from 'react-mdl';
import PropTypes from 'prop-types';
import PhotoGridItem from './PhotoGridItem';

import '../css/PhotoGrid.css';

const PhotoGrid = (props) => {
  const { photos, requestForMorePhotos, areThereMoreResults, isLoading } = props;
  const images = photos.map((imageData, index) => <PhotoGridItem dropbox={props.dropbox} imageData={imageData} key={index} />);

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
    </div>
  );
}

PhotoGrid.propTypes = {
  photos: PropTypes.array
}

export default PhotoGrid;
