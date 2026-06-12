const Unit = require('../models/Unit');

/* ================= CREATE ================= */
exports.createUnit = async (req, res) => {
  try {
    const { name, location } = req.body;

    if (!name || !location) {
      return res.status(400).json({
        success: false,
        message: 'All fields are required',
      });
    }

    const existing = await Unit.findOne({ name });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Unit already exists',
      });
    }

    const unit = await Unit.create({ name, location });

    res.status(201).json({
      success: true,
      message: 'Unit created successfully',
      data: unit,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

/* ================= GET ALL ================= */
exports.getUnits = async (req, res) => {
  try {
    const units = await Unit.find().sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: units,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch units',
    });
  }
};

/* ================= GET SINGLE ================= */
exports.getUnitById = async (req, res) => {
  try {
    const unit = await Unit.findById(req.params.id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }

    res.status(200).json({
      success: true,
      data: unit,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/* ================= UPDATE ================= */
exports.updateUnit = async (req, res) => {
  try {
    const { name, location } = req.body;

    const unit = await Unit.findByIdAndUpdate(
      req.params.id,
      { name, location },
      { new: true, runValidators: true }
    );

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Unit updated successfully',
      data: unit,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Update failed',
    });
  }
};

/* ================= DELETE ================= */
exports.deleteUnit = async (req, res) => {
  try {
    const unit = await Unit.findByIdAndDelete(req.params.id);

    if (!unit) {
      return res.status(404).json({
        success: false,
        message: 'Unit not found',
      });
    }

    res.status(200).json({
      success: true,
      message: 'Unit deleted successfully',
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Delete failed',
    });
  }
};