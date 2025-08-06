// Success response handler
const sendResponse = (res, data = null, message = 'Success', statusCode = 200) => {
    res.status(statusCode).json({
      success: true,
      message,
      data,
      timestamp: new Date().toISOString(),
    });
  };
  
  // Error response handler
  const sendError = (res, message = 'Error', statusCode = 500, errors = null) => {
    res.status(statusCode).json({
      success: false,
      message,
      errors,
      timestamp: new Date().toISOString(),
    });
  };
  
  // Paginated response handler
  const sendPaginatedResponse = (res, data, pagination, message = 'Success') => {
    res.status(200).json({
      success: true,
      message,
      data,
      pagination,
      timestamp: new Date().toISOString(),
    });
  };
  
  module.exports = {
    sendResponse,
    sendError,
    sendPaginatedResponse,
  };