import React, { Component } from 'react';
import PropTypes from 'prop-types';
// import Dropbox from 'dropbox';
import { Cell, Card, CardTitle, CardActions, Icon } from 'react-mdl';

import '../css/PhotoGridItem.css';

class PhotoGridItem extends Component {

  constructor(props) {
    super(props);
    this.Auth = this.Auth.bind(this);
  }

  Auth() {
    // const dropbox = new Dropbox({ clientID: "gscbxcjhou1jx21" });
    // const url = dropbox.getAuthenticationUrl();
    // const key = "gscbxcjhou1jx21"
    // window.open(`https://www.dropbox.com/1/oauth2/authorize?client_id=${key}&response_type=code`);
    // console.log(url);
  }

  render() {
    const { imageData } = this.props;
    const smallimageUrl = `${imageData.urls.small}`;
    const downloadUrl = `${imageData.links.download}`;
    const dimension = `${imageData.width} x ${imageData.height}`;
    const backgroundStyle = {
      background: `url(${smallimageUrl}) center center no-repeat`,
      backgroundSize: "cover"
    };

    return (
      <Cell col={4}>
        <Card className="photo-grid__item" shadow={0} style={backgroundStyle}>
          <CardTitle expand />
          <CardActions style={{height: '52px', padding: '16px', background: 'rgba(0,0,0,0.2)', display: 'flex', boxSizing: 'border-box', alignItems: 'center', color: '#fff'}}>

            <span className="photo-grid__item-dimension">
              {dimension}
            </span>
            <div className="mdl-layout-spacer"></div>
            <div className="icons">
              <a className="download-photo" download href={downloadUrl} >
                <Icon name="file_download" />
              </a>
              <Icon name="cloud_download" className="save-to-dropbox" />
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
