import React, { Component } from 'react';
import Search from './Search';
import { Layout, Header, Navigation, Grid, Cell } from 'react-mdl';

import "../css/Hero.css";

class Hero extends Component {
  render() {
    const { searchTerm, handleChange, handleSubmit } = this.props;
    return (
      <div className="hero-section">

        <Layout className="hero-section-layout">

          <Header transparent title=" " style={{color: 'white'}}>
            <Navigation>
                <a href="#">View on Github</a>
            </Navigation>
          </Header>

          <section className="hero-section__content">

            <div className="hero-section-title">
              <Grid>
                <Cell col={12}>
                  <h1>Stellar Photos</h1>
                  <p>Find free high-quality images</p>
                </Cell>
              </Grid>
            </div>

            <Grid>
              <Cell col={12}>
                <Search
                  searchTerm={searchTerm}
                  handleChange={handleChange}
                  handleSubmit={handleSubmit}
                />
              </Cell>
            </Grid>

          </section>

        </Layout>

      </div>
    )
  }
}

export default Hero;
