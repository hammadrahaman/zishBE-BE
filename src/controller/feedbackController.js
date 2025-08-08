const { Sequelize } = require('sequelize');
const connectDatabase = require('../config/database');  // Import the database connection
const FeedbackModel = require('../models/Feedback');
const logger = require('../utils/logger');

let Feedback;

// Initialize model with proper database connection
const initializeModel = async () => {
  try {
    const sequelize = await connectDatabase();
    Feedback = FeedbackModel(sequelize);
    return Feedback;
  } catch (error) {
    logger.error('Failed to initialize Feedback model:', error);
    throw error;
  }
};

// Submit customer feedback
const submitFeedback = async (req, res) => {
  try {
    // Initialize model if not already initialized
    if (!Feedback) {
      await initializeModel();
    }

    const { customerName, email, rating, feedback } = req.body;

    // Validate required fields
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating is required and must be between 1 and 5',
      });
    }

    // Validate email format if provided
    if (email && email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid email address',
        });
      }
    }

    // Create feedback data
    const feedbackData = {
      customer_name: customerName?.trim() || 'Anonymous',
      email: email && email.trim() !== '' ? email.trim() : null,
      rating: parseInt(rating),
      feedback: feedback && feedback.trim() !== '' ? feedback.trim() : null,
      timestamp: new Date(),
      date: new Date(),
    };

    // Save to database
    const newFeedback = await Feedback.create(feedbackData);

    const response = {
      success: true,
      message: 'Feedback submitted successfully',
      data: {
        id: newFeedback.id,
        customer_name: newFeedback.customer_name,
        email: newFeedback.email || 'Not provided',
        rating: newFeedback.rating,
        feedback: newFeedback.feedback || 'No additional feedback provided',
        timestamp: newFeedback.timestamp,
        date: newFeedback.date,
        created_at: newFeedback.created_at,
        updated_at: newFeedback.updated_at,
      },
    };

    logger.info(`New feedback submitted: ID ${newFeedback.id}, Rating: ${newFeedback.rating}`);
    res.status(201).json(response);
  } catch (error) {
    logger.error('Error submitting feedback:', error);
    
    // Handle validation errors
    if (error.name === 'SequelizeValidationError') {
      const validationErrors = error.errors.map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: validationErrors,
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error submitting feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// Get all feedback (admin only) - UPDATED: No pagination limit
const getAllFeedback = async (req, res) => {
  try {
    if (!Feedback) {
      await initializeModel();
    }
    const {
      rating,
      search,
      sortBy = 'timestamp',
      order = 'desc'
    } = req.query;

    const whereClause = {};
    const orderClause = [[sortBy, order.toUpperCase()]];

    // Apply rating filter
    if (rating) {
      whereClause.rating = parseInt(rating);
    }

    // Apply search filter
    if (search) {
      whereClause[Sequelize.Op.or] = [
        { customer_name: { [Sequelize.Op.iLike]: `%${search}%` } },
        { email: { [Sequelize.Op.iLike]: `%${search}%` } },
        { feedback: { [Sequelize.Op.iLike]: `%${search}%` } },
      ];
    }

    // Get all feedback without pagination
    const feedbackItems = await Feedback.findAll({
      where: whereClause,
      order: orderClause,
    });

    const response = {
      success: true,
      count: feedbackItems.length,
      data: feedbackItems.map(item => ({
        id: item.id,
        customer_name: item.customer_name,
        email: item.email || 'Not provided',
        rating: item.rating,
        feedback: item.feedback || 'No additional feedback provided',
        timestamp: item.timestamp,
        date: item.date,
        created_at: item.created_at,
        updated_at: item.updated_at,
      })),
    };

    logger.info(`Retrieved ${feedbackItems.length} feedback items`);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching feedback:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching feedback',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

// Get feedback statistics - UPDATED: Current month only
const getFeedbackStats = async (req, res) => {
  try {
    if (!Feedback) {
      await initializeModel();
    }
    // Get current month start and end dates
    const now = new Date();
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    console.log('Current month range:', currentMonthStart, 'to', currentMonthEnd);

    // Get total feedback for current month
    const totalFeedback = await Feedback.count({
      where: {
        timestamp: {
          [Sequelize.Op.between]: [currentMonthStart, currentMonthEnd],
        },
      },
    });

    // Get average rating for current month
    const avgResult = await Feedback.findOne({
      attributes: [[Sequelize.fn('AVG', Sequelize.col('rating')), 'averageRating']],
      where: {
        timestamp: {
          [Sequelize.Op.between]: [currentMonthStart, currentMonthEnd],
        },
      },
    });
    const averageRating = parseFloat(avgResult?.dataValues?.averageRating || 0).toFixed(1);

    // Get rating distribution for current month
    const ratingDistribution = {};
    for (let i = 1; i <= 5; i++) {
      const count = await Feedback.count({ 
        where: { 
          rating: i,
          timestamp: {
            [Sequelize.Op.between]: [currentMonthStart, currentMonthEnd],
          },
        } 
      });
      ratingDistribution[i] = count;
    }

    // Get recent feedback (last 7 days within current month)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    // Use the later date between 7 days ago and current month start
    const recentStartDate = sevenDaysAgo > currentMonthStart ? sevenDaysAgo : currentMonthStart;
    
    const recentFeedback = await Feedback.count({
      where: {
        timestamp: {
          [Sequelize.Op.between]: [recentStartDate, currentMonthEnd],
        },
      },
    });

    // Get current week stats (within current month)
    const currentWeekStart = new Date();
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay()); // Sunday
    currentWeekStart.setHours(0, 0, 0, 0);
    
    // Use the later date between current week start and current month start
    const weekStartDate = currentWeekStart > currentMonthStart ? currentWeekStart : currentMonthStart;

    const currentWeekCount = await Feedback.count({
      where: {
        timestamp: {
          [Sequelize.Op.between]: [weekStartDate, currentMonthEnd],
        },
      },
    });

    const currentWeekAvg = await Feedback.findOne({
      attributes: [[Sequelize.fn('AVG', Sequelize.col('rating')), 'averageRating']],
      where: {
        timestamp: {
          [Sequelize.Op.between]: [weekStartDate, currentMonthEnd],
        },
      },
    });

    // Get previous week stats (within current month)
    const previousWeekStart = new Date(currentWeekStart);
    previousWeekStart.setDate(previousWeekStart.getDate() - 7);
    const previousWeekEnd = new Date(currentWeekStart);
    previousWeekEnd.setDate(previousWeekEnd.getDate() - 1);
    previousWeekEnd.setHours(23, 59, 59, 999);

    // Only include previous week if it's within current month
    let previousWeekCount = 0;
    let previousWeekAvgRating = "0.0";

    if (previousWeekStart >= currentMonthStart) {
      previousWeekCount = await Feedback.count({
        where: {
          timestamp: {
            [Sequelize.Op.between]: [previousWeekStart, previousWeekEnd],
          },
        },
      });

      const previousWeekAvg = await Feedback.findOne({
        attributes: [[Sequelize.fn('AVG', Sequelize.col('rating')), 'averageRating']],
        where: {
          timestamp: {
            [Sequelize.Op.between]: [previousWeekStart, previousWeekEnd],
          },
        },
      });

      previousWeekAvgRating = parseFloat(previousWeekAvg?.dataValues?.averageRating || 0).toFixed(1);
    }

    const response = {
      success: true,
      data: {
        totalFeedback,
        averageRating: parseFloat(averageRating),
        ratingDistribution,
        recentFeedback, // Last 7 days
        trends: {
          currentWeek: {
            total: currentWeekCount,
            averageRating: parseFloat(currentWeekAvg?.dataValues?.averageRating || 0).toFixed(1),
          },
          previousWeek: {
            total: previousWeekCount,
            averageRating: previousWeekAvgRating,
          },
        },
        monthInfo: {
          month: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
          startDate: currentMonthStart.toISOString(),
          endDate: currentMonthEnd.toISOString(),
        }
      },
    };

    logger.info(`Retrieved feedback statistics for ${response.data.monthInfo.month}`);
    res.status(200).json(response);
  } catch (error) {
    logger.error('Error fetching feedback statistics:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching feedback statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
    });
  }
};

module.exports = {
  submitFeedback,
  getAllFeedback,
  getFeedbackStats,
}; 