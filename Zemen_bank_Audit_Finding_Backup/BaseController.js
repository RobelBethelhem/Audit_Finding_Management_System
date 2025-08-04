// controllers/BaseController.js
class BaseController {
    constructor(model) {
      this.model = model;
    }
  
    async create(req, res) {
      try {
        const data = await this.model.create(req.body);
        res.status(201).json(data);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    }
  
    async findAll(req, res) {
      try {
        const data = await this.model.findAll({
          where: req.query,
          include: req.include || []
        });
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  
    async findById(req, res) {
      try {
        const data = await this.model.findByPk(req.params.id, {
          include: req.include || []
        });
        if (!data) {
          return res.status(404).json({ error: 'Not found' });
        }
        res.json(data);
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  
    async update(req, res) {
      try {
        const [updated] = await this.model.update(req.body, {
          where: { id: req.params.id }
        });
        if (!updated) {
          return res.status(404).json({ error: 'Not found' });
        }
        const updatedData = await this.model.findByPk(req.params.id);
        res.json(updatedData);
      } catch (error) {
        res.status(400).json({ error: error.message });
      }
    }
  
    async delete(req, res) {
      try {
        const deleted = await this.model.destroy({
          where: { id: req.params.id }
        });
        if (!deleted) {
          return res.status(404).json({ error: 'Not found' });
        }
        res.status(204).json();
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    }
  }
  
  module.exports = BaseController;