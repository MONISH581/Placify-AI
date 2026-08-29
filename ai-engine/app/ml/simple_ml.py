
# pyrefly: ignore [missing-import]
import numpy as np

class SimpleDecisionTreeClassifier:
    """A very basic decision tree classifier implemented in pure NumPy/Python"""
    def __init__(self, max_depth=5):
        self.max_depth = max_depth
        self.tree = None

    def fit(self, X, y):
        self.tree = self._build_tree(X, y, depth=0)
        return self

    def _build_tree(self, X, y, depth):
        num_samples, num_features = X.shape
        num_labels = len(np.unique(y))

        # Base cases
        if depth >= self.max_depth or num_labels == 1 or num_samples < 2:
            return {"val": np.bincount(y).argmax() if len(y) > 0 else 0}

        # Find best split
        best_feat, best_thresh = self._best_split(X, y, num_samples, num_features)
        
        if best_feat is None:
            return {"val": np.bincount(y).argmax() if len(y) > 0 else 0}

        left_indices = X[:, best_feat] <= best_thresh
        right_indices = ~left_indices
        
        left_child = self._build_tree(X[left_indices], y[left_indices], depth + 1)
        right_child = self._build_tree(X[right_indices], y[right_indices], depth + 1)
        
        return {
            "feature": best_feat,
            "threshold": best_thresh,
            "left": left_child,
            "right": right_child
        }

    def _best_split(self, X, y, num_samples, num_features):
        best_gini = 999.0
        split_feat, split_thresh = None, None

        for feat in range(num_features):
            thresholds = np.unique(X[:, feat])
            # Limit the thresholds for speed
            if len(thresholds) > 10:
                thresholds = np.percentile(X[:, feat], [10, 30, 50, 70, 90])
                
            for thresh in thresholds:
                left_indices = X[:, feat] <= thresh
                y_left = y[left_indices]
                y_right = y[~left_indices]
                
                if len(y_left) == 0 or len(y_right) == 0:
                    continue
                
                gini = (len(y_left) * self._gini(y_left) + len(y_right) * self._gini(y_right)) / num_samples
                if gini < best_gini:
                    best_gini = gini
                    split_feat = feat
                    split_thresh = thresh
                    
        return split_feat, split_thresh

    def _gini(self, y):
        counts = np.bincount(y)
        probabilities = counts / len(y)
        return 1.0 - np.sum(probabilities ** 2)

    def predict(self, X):
        return np.array([self._predict_row(self.tree, row) for row in X])

    def _predict_row(self, node, row):
        if "val" in node:
            return node["val"]
        if row[node["feature"]] <= node["threshold"]:
            return self._predict_row(node["left"], row)
        return self._predict_row(node["right"], row)


class SimpleDecisionTreeRegressor:
    """A very basic decision tree regressor in pure NumPy/Python"""
    def __init__(self, max_depth=5):
        self.max_depth = max_depth
        self.tree = None

    def fit(self, X, y):
        self.tree = self._build_tree(X, y, depth=0)
        return self

    def _build_tree(self, X, y, depth):
        num_samples, num_features = X.shape

        # Base cases
        if depth >= self.max_depth or num_samples < 5:
            return {"val": np.mean(y) if len(y) > 0 else 0.0}

        # Find best split
        best_feat, best_thresh = self._best_split(X, y, num_samples, num_features)
        
        if best_feat is None:
            return {"val": np.mean(y) if len(y) > 0 else 0.0}

        left_indices = X[:, best_feat] <= best_thresh
        right_indices = ~left_indices
        
        left_child = self._build_tree(X[left_indices], y[left_indices], depth + 1)
        right_child = self._build_tree(X[right_indices], y[right_indices], depth + 1)
        
        return {
            "feature": best_feat,
            "threshold": best_thresh,
            "left": left_child,
            "right": right_child
        }

    def _best_split(self, X, y, num_samples, num_features):
        best_mse = 99999999.0
        split_feat, split_thresh = None, None

        for feat in range(num_features):
            thresholds = np.unique(X[:, feat])
            if len(thresholds) > 10:
                thresholds = np.percentile(X[:, feat], [10, 30, 50, 70, 90])
                
            for thresh in thresholds:
                left_indices = X[:, feat] <= thresh
                y_left = y[left_indices]
                y_right = y[~left_indices]
                
                if len(y_left) == 0 or len(y_right) == 0:
                    continue
                
                mse = len(y_left) * np.var(y_left) + len(y_right) * np.var(y_right)
                if mse < best_mse:
                    best_mse = mse
                    split_feat = feat
                    split_thresh = thresh
                    
        return split_feat, split_thresh

    def predict(self, X):
        return np.array([self._predict_row(self.tree, row) for row in X])

    def _predict_row(self, node, row):
        if "val" in node:
            return node["val"]
        if row[node["feature"]] <= node["threshold"]:
            return self._predict_row(node["left"], row)
        return self._predict_row(node["right"], row)
