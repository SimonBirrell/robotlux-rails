window.LuxUi.TopicViews = window.LuxUi.TopicViews || {};

var injected = {};

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

ImageView.prototype.setScene = function(canvas, renderWidth, renderHeight) {
};

ImageView.prototype.setTopicWindowSize = function() {
};


ImageView.prototype.viewType = 'ImageView';

window.LuxUi.TopicViews.ImageView = ImageView;
