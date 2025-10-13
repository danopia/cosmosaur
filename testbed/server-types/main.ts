import { Meteor } from 'meteor/meteor';
import { Mongo } from 'meteor/mongo';
import { check } from 'meteor/check';

const Projects = new Mongo.Collection<{
  _id: string;
  title: string;
  createdAt: Date;
}>('Projects');

const Tasks = new Mongo.Collection<{
  _id: string;
  projectId: string;
  title: string;
  createdAt: Date;
}>('Tasks');

Meteor.publish('Chores', () => Projects.find({}))
Meteor.publish('AllData', () => [
  Projects.find(),
  Tasks.find({}),
]);

Meteor.methods({
  async 'create-project'(title: unknown) {
    check(title, String);
    return await Projects.insertAsync({
      title,
      createdAt: new Date,
    });
  },
  async 'create-task'(projectId: unknown, title: unknown) {
    check(projectId, String);
    check(title, String);
    return await Tasks.insertAsync({
      projectId,
      title,
      createdAt: new Date,
    });
  },
});
