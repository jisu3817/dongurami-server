'use strict';

const Board = require('../../models/services/Board/Board');
const Comment = require('../../models/services/Board/Comment/Comment');
const Image = require('../../models/services/Image/Image');
const logger = require('../../config/logger');

const process = {
  createBoardNum: async (req, res) => {
    const board = new Board(req);
    const image = new Image(req);
    const response = await board.createBoardNum();
    const { category } = req.params;

    if (response.success) {
      const imgNums = await image.saveBoardImg(response.boardNum);

      delete response.boardNum;

      if (imgNums.isError) {
        logger.error(
          `POST /api/board/${category} 500: \n${imgNums.errMsg.stack}`
        );
        return res.status(500).json(imgNums.clientMsg);
      }
      logger.info(`POST /api/board/${category} 201: ${response.msg}`);
      return res.status(201).json(response);
    }
    if (response.isError) {
      logger.error(
        `POST /api/board/${category} 500: \n${response.errMsg.stack}`
      );
      return res.status(500).json(response.clientMsg);
    }
    if (response.status === 403) {
      logger.error(`POST /api/board/${category} 403: ${response.msg}`);
      return res.status(403).json(response);
    }
    logger.error(`POST /api/board/${category} 400: ${response.msg}`);
    return res.status(400).json(response);
  },

  findAllByCategoryNum: async (req, res) => {
    const board = new Board(req);
    const response = await board.findAllByCategoryNum();
    const { category } = req.params;

    if (response.success) {
      logger.info(`GET /api/board/${category} 200: ${response.msg}`);
      return res.status(200).json(response);
    }
    if (response.isError) {
      logger.error(
        `GET /api/board/${category} 500: \n${response.errMsg.stack}`
      );
      return res.status(500).json(response.clientMsg);
    }
    if (response.msg === '해당 동아리에 가입하지 않았습니다.') {
      logger.error(
        `GET /api/club/board/${category}/${req.params.clubNum} 403: ${response.msg}`
      );
      return res.status(403).json(response);
    }
    logger.error(`GET /api/board/${category} 404: ${response.msg}`);
    return res.status(404).json(response);
  },

  findAllByPromotionCategory: async (req, res) => {
    const board = new Board(req);
    const response = await board.findAllByPromotionCategory();

    if (response.success) {
      logger.info(`GET /api/board/promotion/club 200: ${response.msg}`);
      return res.status(200).json(response);
    }
    logger.error(
      `GET /api/board/promotion/club 500: \n${response.errMsg.stack}`
    );
    return res.status(500).json(response.clientMsg);
  },

  findOneByBoardNum: async (req, res) => {
    const board = new Board(req);
    const comment = new Comment(req);
    const image = new Image(req);
    const response = await board.findOneByBoardNum();
    const { category } = req.params;
    const { boardNum } = req.params;

    if (response.success) {
      if (response.category === 4) {
        response.images = await image.findAllByBoardImg();

        if (response.images.isError) {
          logger.error(
            `GET /api/board/${category}/${boardNum} 500: \n${response.images.errMsg.stack}`
          );
          return res.status(500).json(response.images.clientMsg);
        }
      }
      // 동아리 활동일지 & 마이페이지는 댓글이 달리지 않기 때문에 조건문을 사용해 주어야됨.
      if (response.category < 6) {
        response.comments = await comment.findAllByBoardNum();

        if (response.comments.isError) {
          logger.error(
            `GET /api/board/${category}/${boardNum} 500: \n${response.comments.errMsg.stack}`
          );
          return res.status(500).json(response.comments.clientMsg);
        }
      }
      logger.info(
        `GET /api/board/${category}/${boardNum} 200: ${response.msg}`
      );
      return res.status(200).json(response);
    }
    if (response.isError) {
      logger.error(
        `GET /api/board/${category}/${boardNum} 500: \n${response.errMsg.stack}`
      );
      return res.status(500).json(response.clientMsg);
    }
    if (response.msg === '해당 동아리에 가입하지 않았습니다.') {
      logger.error(
        `GET /api/board/${category}/${boardNum} 403: ${response.msg}`
      );
      return res.status(403).json(response);
    }
    logger.error(`GET /api/board/${category}/${boardNum} 404: ${response.msg}`);
    return res.status(404).json(response);
  },

  updateOneByBoardNum: async (req, res) => {
    const board = new Board(req);
    const image = new Image(req);
    const response = await board.updateOneByBoardNum();
    const { category } = req.params;
    const { boardNum } = req.params;

    if (response.success) {
      const updateImage = await image.updateBoardImg();

      if (updateImage.isError) {
        logger.error(
          `PUT /api/board/${category}/${boardNum} 500: \n${updateImage.errMsg.stack}`
        );
        return res.status(500).json(updateImage.clientMsg);
      }
      if (!updateImage.success) {
        logger.error(
          `PUT /api/board/${category}/${boardNum} 400: ${updateImage.msg}`
        );
        return res.status(400).json(updateImage);
      }
      logger.info(
        `PUT /api/board/${category}/${boardNum} 200: ${response.msg}`
      );
      return res.status(200).json(response);
    }
    if (response.isError) {
      logger.error(
        `PUT /api/board/${category}/${boardNum} 500: \n${response.errMsg.stack}`
      );
      return res.status(500).json(response.clientMsg);
    }
    logger.error(`PUT /api/board/${category}/${boardNum} 404: ${response.msg}`);
    return res.status(404).json(response);
  },

  updateOnlyHitByNum: async (req, res) => {
    const board = new Board(req);
    const response = await board.updateOnlyHitByNum();
    const { category } = req.params;
    const { boardNum } = req.params;

    if (response.success) {
      logger.info(
        `PATCH /api/board/${category}/${boardNum} 200: ${response.msg}`
      );
      return res.status(200).json(response);
    }
    if (response.isError) {
      logger.info(
        `PATCH /api/board/${category}/${boardNum} 500: \n${response.errMsg.stack}`
      );
      return res.status(500).json(response.clientMsg);
    }
    logger.info(
      `PATCH /api/board/${category}/${boardNum} 404: ${response.msg}`
    );
    return res.status(404).json(response);
  },

  deleteOneByBoardNum: async (req, res) => {
    const board = new Board(req);
    const response = await board.deleteOneByBoardNum();
    const { category } = req.params;
    const { boardNum } = req.params;

    if (response.success) {
      logger.info(
        `DELETE /api/board/${category}/${boardNum} 200: ${response.msg}`
      );
      return res.status(200).json(response);
    }
    if (response.isError) {
      logger.error(
        `DELETE /api/board/${category}/${boardNum} 500: \n${response.errMsg.stack}`
      );
      return res.status(500).json(response.clientMsg);
    }
    logger.error(
      `DELETE /api/board/${category}/${boardNum} 404: ${response.msg}`
    );
    return res.status(404).json(response);
  },
};

module.exports = {
  process,
};
