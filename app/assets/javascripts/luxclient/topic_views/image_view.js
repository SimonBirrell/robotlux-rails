window.LuxUi.TopicViews = window.LuxUi.TopicViews || {};

var injected = {
  topicNameToId: function (name, i) {
    name = name.replace(/\//g, '--');
    return 'topic-display-' + name.substring(2) + "-" + i.toString();
  }
};


var ImageView = function(viewSpec) {
  return this;
};

ImageView.updateViews = function(selection, uiGraph, viewType) {
  if (injected.updateCanvasesForViewType !== undefined) {
    injected.updateCanvasesForViewType(uiGraph, viewType || ImageView.prototype.viewType);
  }
};

ImageView.injectUpdateViews = function(method) {
  injected.updateCanvasesForViewType = method;
};

ImageView.tick = function() {
};

ImageView.prototype.animateAndRender = function() {
};

ImageView.prototype.update = function(node) {
  var topicDisplayTextId = '#' + injected.topicNameToId(node.name, 0);
  $(topicDisplayTextId).html(
    '<img src="data:image/jpeg;base64,' + node.data.message.data + '"/>'
  );
  debugger
  'hat'
};

ImageView.prototype.setScene = function(canvas, renderWidth, renderHeight) {
};

ImageView.prototype.setTopicWindowSize = function() {
};


ImageView.prototype.viewType = 'ImageView';

window.LuxUi.TopicViews.ImageView = ImageView;
