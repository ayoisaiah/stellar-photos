import * as r from 'runtypes';

const Weather = r.Record({
  id: r.Number,
  main: r.String,
  description: r.String,
  icon: r.String,
});

const Main = r.Record({
  temp: r.Number,
});

const Forecast = r
  .Record({
    weather: r.Array(Weather),
    main: Main,
    dt: r.Number,
    name: r.String,
  })
  .And(
    r.Partial({
      timestamp: r.Number,
    })
  );

type Forecast = r.Static<typeof Forecast>;

export { Forecast };
