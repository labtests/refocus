/**
 * Copyright (c) 2016, salesforce.com, inc.
 * All rights reserved.
 * Licensed under the BSD 3-Clause license.
 * For full license text, see LICENSE.txt file in the repo root or
 * https://opensource.org/licenses/BSD-3-Clause
 */

/**
 * db/model/perspective.js
 */
'use strict'; // eslint-disable-line strict

const common = require('../helpers/common');
const MissingRequiredFieldError = require('../dbErrors')
  .MissingRequiredFieldError;
const constants = require('../constants');
const assoc = {};
const eventName = 'refocus.internal.realtime.perspective.namespace.initialize';

module.exports = function perspective(seq, dataTypes) {
  const Perspective = seq.define('Perspective', {
    id: {
      type: dataTypes.UUID,
      primaryKey: true,
      defaultValue: dataTypes.UUIDV4,
    },
    isDeleted: {
      type: dataTypes.BIGINT,
      defaultValue: 0,
      allowNull: false,
    },
    name: {
      type: dataTypes.STRING,
      allowNull: false,
    },
    rootSubject: {
      type: dataTypes.STRING(constants.fieldlen.longish),
      allowNull: false,
    },
    aspectFilterType: {
      type: dataTypes.ENUM('INCLUDE', 'EXCLUDE'),
      defaultValue: 'EXCLUDE',
      allowNull: false,
    },
    aspectFilter: {
      type: dataTypes.ARRAY(dataTypes.STRING(constants.fieldlen.normalName)),
      defaultValue: constants.defaultArrayValue,
      allowNull: true,
    },
    aspectTagFilterType: {
      type: dataTypes.ENUM('INCLUDE', 'EXCLUDE'),
      defaultValue: 'EXCLUDE',
      allowNull: false,
    },
    aspectTagFilter: {
      type: dataTypes.ARRAY(dataTypes.STRING(constants.fieldlen.normalName)),
      defaultValue: constants.defaultArrayValue,
      allowNull: true,
    },
    subjectTagFilterType: {
      type: dataTypes.ENUM('INCLUDE', 'EXCLUDE'),
      defaultValue: 'EXCLUDE',
      allowNull: false,
    },
    subjectTagFilter: {
      type: dataTypes.ARRAY(dataTypes.STRING(constants.fieldlen.normalName)),
      defaultValue: constants.defaultArrayValue,
      allowNull: true,
    },
    statusFilterType: {
      type: dataTypes.ENUM('INCLUDE', 'EXCLUDE'),
      defaultValue: 'EXCLUDE',
      allowNull: false,
    },
    statusFilter: {
      type: dataTypes.ARRAY(dataTypes.STRING),
      defaultValue: constants.defaultArrayValue,
      allowNull: true,
    },
  }, {
    classMethods: {
      getPerspectiveAssociations() {
        return assoc;
      },

      getProfileAccessField() {
        return 'perspectiveAccess';
      },

      postImport(models) {
        assoc.createdBy = Perspective.belongsTo(models.User, {
          foreignKey: 'createdBy',
        });
        assoc.lens = Perspective.belongsTo(models.Lens, {
          as: 'lens',
          foreignKey: {
            name: 'lensId',
            allowNull: false,
          },
        });
        assoc.writers = Perspective.belongsToMany(models.User, {
          as: 'writers',
          through: 'PerspectiveWriters',
          foreignKey: 'perspectiveId',
        });
        Perspective.addScope('defaultScope', {
          include: [

            // assoc.createdBy,
            {
              association: assoc.lens,
              attributes: [
                'helpEmail',
                'helpUrl',
                'id',
                'name',
                'thumbnailUrl',
                'version',
              ],
            },
          ],
          order: ['Perspective.name'],
        }, {
          override: true,
        });

        Perspective.addScope('withoutLensAssociation', {
          include: [],
          order: ['Perspective.name'],
        });
      },
    },
    hooks: {

      beforeDestroy(inst /* , opts */) {
        return common.setIsDeleted(seq.Promise, inst);
      },

      /**
       * Publishes the created prespective to the redis channel, to initialize
       * a socketio namespace if required
       *
       * @param {Perspective} inst - The newly-created instance
       */
      afterCreate(inst /* , opts */) {
        const changedKeys = Object.keys(inst._changed);
        const ignoreAttributes = ['isDeleted'];
        return common.publishChange(inst, eventName, changedKeys,
              ignoreAttributes);
      },

      /**
       * Publishes the updated prespective to the redis channel, to initialize
       * a socketio namespace if required
       *
       * @param {Perspective} inst - The updated instance
       */
      afterUpdate(inst /* , opts */) {
        const changedKeys = Object.keys(inst._changed);
        const ignoreAttributes = ['isDeleted'];
        return common.publishChange(inst, eventName, changedKeys,
              ignoreAttributes);
      },

      /*
       * TODO: socketio namespace object is garbage collected when there are
       * no references to it. We still have to check, if deleting the namespace
       * object manually in the afterDelete hook will help.
       */
    },
    indexes: [
      {
        name: 'PerspectiveUniqueLowercaseNameIsDeleted',
        unique: true,
        fields: [
          seq.fn('lower', seq.col('name')),
          'isDeleted',
        ],
      },
    ],
    instanceMethods: {
      isWritableBy(who) {
        return new seq.Promise((resolve /* , reject */) =>
          this.getWriters()
          .then((writers) => {
            if (!writers.length) {
              resolve(true);
            }

            const found = writers.filter((w) =>
              w.name === who || w.id === who);
            resolve(found.length === 1);
          }));
      }, // isWritableBy
    },
    paranoid: true,
    validate: {
      lensIdNotNull() {
        if (!this.lensId) {
          const err = new MissingRequiredFieldError();
          err.fields = ['lensId'];
          throw err;
        }
      }, // lensIdNotNull
    },
  });
  return Perspective;
};
