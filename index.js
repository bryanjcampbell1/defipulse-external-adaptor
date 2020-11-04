const { Requester, Validator } = require('@chainlink/external-adapter')

const customError = (data) => {
  if (data.Response === 'Error') return true
  return false
}

const customParams = {
  project: ['project'],
  endpoint: false
}

const createRequest = (input, callback) => {
  const validator = new Validator(callback, input, customParams)
  const jobRunID = validator.validated.id

  const project = validator.validated.data.project

  const apiKey = process.env.API_KEY
  let endpoint = ''
  let url = ''

  if (project === 'All') {
    endpoint = validator.validated.data.endpoint || 'MarketData'
    url = `https://data-api.defipulse.com/api/v1/defipulse/api/${endpoint}?api-key=${apiKey}`
  } else {
    endpoint = validator.validated.data.endpoint || 'GetProjects'
    url = `https://data-api.defipulse.com/api/v1/defipulse/api/${endpoint}?api-key=${apiKey}`
  }

  const params = {
  }

  const config = {
    url,
    params
  }

  Requester.request(config, customError)
    .then(response => {
      let value = ''

      if (project === 'All') {
        value = response.data.All.total
      } else {
        for (let i = 0; i < response.data.length; i++) {
          if (response.data[i].name === project) {
            value = response.data[i].value.tvl.USD.value
          }
        }
      }

      const dummy = {
        name: `${project}`,
        value: Number(value).toFixed(0)
      }

      response.data.result = Requester.validateResultNumber(dummy, ['value'])
      callback(response.status, Requester.success(jobRunID, response))
    })
    .catch(error => {
      callback(500, Requester.errored(jobRunID, error))
    })
}

// This is a wrapper to allow the function to work with
// GCP Functions
exports.gcpservice = (req, res) => {
  createRequest(req.body, (statusCode, data) => {
    res.status(statusCode).send(data)
  })
}

// This is a wrapper to allow the function to work with
// AWS Lambda
exports.handler = (event, context, callback) => {
  createRequest(event, (statusCode, data) => {
    callback(null, data)
  })
}

// This is a wrapper to allow the function to work with
// newer AWS Lambda implementations
exports.handlerv2 = (event, context, callback) => {
  createRequest(JSON.parse(event.body), (statusCode, data) => {
    callback(null, {
      statusCode: statusCode,
      body: JSON.stringify(data),
      isBase64Encoded: false
    })
  })
}

// This allows the function to be exported for testing
// or for running in express
module.exports.createRequest = createRequest
