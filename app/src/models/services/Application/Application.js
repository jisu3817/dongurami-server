'use strict';

const ApplicationUtil = require('./ApplicationUtils');
const ApplicationStorage = require('./ApplicationStorage');
const Error = require('../../utils/Error');

class Application {
  constructor(req) {
    this.req = req;
    this.body = req.body;
    this.params = req.params;
    this.auth = req.auth;
  }

  async findAllByClubNum() {
    const { clubNum } = this.params;
    try {
      const leaderInfo = await ApplicationUtil.findOneLeader(clubNum);

      if (leaderInfo) {
        const ids = {
          leaderId: leaderInfo.leader,
          clientId: this.auth.id,
        };
        const clientInfo = await ApplicationUtil.findOneClient(ids);
        const questions = await ApplicationUtil.findAllQuestions(clubNum);

        return ApplicationUtil.makeMsg(200, '동아리 가입 신청서 조회 성공', {
          clientInfo,
          questions,
        });
      }
      return ApplicationUtil.makeMsg(404, '존재하지 않는 동아리입니다.');
    } catch (err) {
      return Error.ctrl('', err);
    }
  }

  async createQuestion() {
    const { clubNum } = this.params;

    try {
      const questionInfo = {
        clubNum,
        description: this.body.description,
      };

      const leaderInfo = await ApplicationUtil.findOneLeader(clubNum);

      if (leaderInfo.leader === this.auth.id) {
        if (await ApplicationStorage.createQuestion(questionInfo)) {
          return ApplicationUtil.makeMsg(201, '질문이 등록되었습니다.');
        }
        return ApplicationUtil.makeMsg(400, '질문이 등록되지 않았습니다.');
      }
      return ApplicationUtil.makeMsg(403, '질문 등록 권한이 없습니다.');
    } catch (err) {
      return Error.ctrl('', err);
    }
  }

  async updateQuestion() {
    const { clubNum } = this.params;
    try {
      const leaderInfo = await ApplicationUtil.findOneLeader(clubNum);

      if (leaderInfo.leader === this.auth.id) {
        if (await ApplicationUtil.findOneWaitingApplicant(clubNum)) {
          return ApplicationUtil.makeMsg(
            400,
            '가입 신청 대기자가 있으므로 질문을 변경할 수 없습니다.'
          );
        }

        const questionInfo = {
          no: this.params.questionNo,
          description: this.body.description,
        };

        if (await ApplicationStorage.updateQuestion(questionInfo)) {
          return ApplicationUtil.makeMsg(200, '질문이 수정되었습니다.');
        }
        return ApplicationUtil.makeMsg(400, '질문이 수정되지 않았습니다.');
      }
      return ApplicationUtil.makeMsg(403, '질문 수정 권한이 없습니다.');
    } catch (err) {
      return Error.ctrl('', err);
    }
  }

  async deleteQuestion() {
    const { clubNum } = this.params;
    try {
      const leaderInfo = await ApplicationUtil.findOneLeader(clubNum);

      if (leaderInfo.leader === this.auth.id) {
        if (await ApplicationUtil.findOneWaitingApplicant(clubNum)) {
          return ApplicationUtil.makeMsg(
            400,
            '가입 신청 대기자가 있으므로 질문을 삭제할 수 없습니다.'
          );
        }

        if (await ApplicationStorage.deleteQuestion(this.params.questionNo)) {
          return ApplicationUtil.makeMsg(200, '질문이 삭제되었습니다.');
        }
        return ApplicationUtil.makeMsg(400, '질문이 삭제되지 않았습니다.');
      }
      return ApplicationUtil.makeMsg(403, '질문 삭제 권한이 없습니다.');
    } catch (err) {
      return Error.ctrl('개발자에게 문의해주세요.', err);
    }
  }

  async checkApplicantRecord() {
    const applicantInfo = {
      clubNum: this.params.clubNum,
      id: this.auth.id,
    };
    const applicant = await ApplicationStorage.checkApplicantRecord(
      applicantInfo
    );

    return applicant;
  }

  static nullCheckBasicAnswer(basicAnswer) {
    return basicAnswer.grade && basicAnswer.gender && basicAnswer.phoneNum;
  }

  async createBasicAnswer() {
    const basicAnswer = this.body.basic;
    const basicAnswerInfo = {
      id: this.auth.id,
      grade: basicAnswer.grade,
      gender: basicAnswer.gender,
      phoneNum: basicAnswer.phoneNum,
    };

    const isCreate = await ApplicationStorage.createBasicAnswer(
      basicAnswerInfo
    );

    return !!isCreate;
  }

  static checkPhoneNumFormat(phoneNum) {
    const PHONE_NUMBER_REGEXP = /^[0-9]/;

    return phoneNum.length !== 11 || !PHONE_NUMBER_REGEXP.test(phoneNum);
  }

  async checkDuplicatePhoneNum() {
    const phoneNumInfo = {
      phoneNum: this.body.basic.phoneNum,
      id: this.auth.id,
    };
    const duplicatePhoneNum = await ApplicationStorage.findDuplicatePhoneNum(
      phoneNumInfo
    );

    return !!duplicatePhoneNum;
  }

  async deleteExtraAnswer(extraAnswers) {
    const extraQuestionNums = extraAnswers.map((extraAnswer) => {
      return extraAnswer.no;
    });

    const extraAnswerInfo = {
      extraQuestionNums,
      id: this.auth.id,
    };

    await ApplicationStorage.deleteExtraAnswer(extraAnswerInfo);
  }

  async createExtraAnswer() {
    const answerInfo = {
      extraAnswers: this.body.extra,
      id: this.auth.id,
    };

    const createExtraAnswer = await ApplicationStorage.createExtraAnswer(
      answerInfo
    );

    return createExtraAnswer;
  }

  async createApplicant() {
    const applicantInfo = {
      clubNum: this.params.clubNum,
      id: this.auth.id,
    };

    const applicant = await ApplicationStorage.createApplicant(applicantInfo);

    return applicant;
  }

  async createAnswer() {
    const basicAnswer = this.body.basic;
    const extraAnswers = this.body.extra;

    try {
      if ((await ApplicationUtil.findOneLeader()).leader === this.auth.id) {
        return ApplicationUtil.makeMsg(400, '이미 가입된 동아리입니다.');
      }

      const applicant = await this.checkApplicantRecord();

      if (applicant !== undefined && applicant.readingFlag !== 2) {
        const msg = applicant.readingFlag
          ? '이미 가입된 동아리입니다.'
          : '가입 승인 대기중입니다.';

        return ApplicationUtil.makeMsg(400, msg);
      }

      if (this.nullCheckBasicAnswer(basicAnswer)) {
        return ApplicationUtil.makeMsg(400, '필수 답변을 전부 기입해주세요.');
      }

      if (!Application.checkPhoneNumFormat(basicAnswer.phoneNum)) {
        return ApplicationUtil.makeMsg(400, '전화번호 형식이 맞지 않습니다.');
      }

      if (!(await this.checkDuplicatePhoneNum())) {
        return ApplicationUtil.makeMsg(409, '다른 유저가 사용중인 번호입니다.');
      }

      if (!(await this.createBasicAnswer())) {
        return ApplicationUtil.makeMsg(400, '필수 답변이 작성되지 않았습니다.');
      }

      if (extraAnswers.length) {
        if (applicant) await this.deleteExtraAnswer(extraAnswers);

        const createExtraAnswer = await this.createExtraAnswer();

        if (createExtraAnswer !== extraAnswers.length) {
          return ApplicationUtil.makeMsg(
            400,
            '추가 답변이 작성되지 않았습니다.'
          );
        }
      }

      await this.createApplicant();
      return ApplicationUtil.makeMsg(200, '가입 신청이 완료되었습니다.');
    } catch (err) {
      return Error.ctrl('', err);
    }
  }
}

module.exports = Application;
