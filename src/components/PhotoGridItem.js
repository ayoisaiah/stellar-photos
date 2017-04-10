import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { Cell, Card, CardTitle, CardActions, Icon } from 'react-mdl';

import '../css/PhotoGridItem.css';

class PhotoGridItem extends Component {

  render() {
    const { imageData, handleSaveToDropbox } = this.props;
    const smallimageUrl = `${imageData.urls.small}`;
    const downloadUrl = `${imageData.links.download}`;
    const dimension = `${imageData.width} x ${imageData.height}`;
    const imageId = `${imageData.id}`;
    const backgroundStyle = {
      background: `url(${smallimageUrl}) center center no-repeat`
    };

    return (
      <Cell col={3}>
        <Card className="photo-grid__item" shadow={0} style={backgroundStyle}>
          <CardTitle expand />
          <CardActions style={{height: '52px', padding: '16px', background: 'rgba(0,0,0,0.2)', display: 'flex', boxSizing: 'border-box', alignItems: 'center', color: '#fff'}}>

            <span className="photo-grid__item-dimension">
              {dimension}
            </span>
            <div className="mdl-layout-spacer"></div>
            <div className="icons">
              <a className="download-photo" title="Download Image" download href={downloadUrl} target="_blank" >
                <Icon name="file_download" />
              </a>
              <a title="Save to Dropbox">
                <Icon
                  name="cloud_download"
                  className="save-to-dropbox"
                  onClick={() => handleSaveToDropbox(imageId, downloadUrl) }
                />
              </a>
            </div>
          </CardActions>
        </Card>

      </Cell>
    );
  }
}

PhotoGridItem.propTypes = {
  imageData: PropTypes.object.isRequired
}

export default PhotoGridItem;
