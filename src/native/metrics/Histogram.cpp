#include <math.h>

#include "Histogram.hpp"

namespace datadog {
  // Histogram::Histogram() {
  //   percentiles_.reset(tdigest::td_new(1000));
  // }

  uint64_t Histogram::min() { return min_; }
  uint64_t Histogram::max() { return max_; }
  uint64_t Histogram::sum() { return sum_; }
  uint64_t Histogram::avg() { return count_ == 0 ? 0 : sum_ / count_; }
  uint64_t Histogram::count() { return count_; }
  uint64_t Histogram::percentile(double upper_bound) {
    return 0;
    // if (count_ == 0) return 0;

    // return ceil(tdigest::td_value_at(percentiles_.get(), upper_bound));
  }

  void Histogram::reset() {
    min_ = 0;
    max_ = 0;
    sum_ = 0;
    count_ = 0;
    // percentiles_.reset(tdigest::td_new(1000));
  }

  void Histogram::add(uint64_t value) {
    if (count_ == 0) {
      min_ = max_ = value;
    } else {
      min_ = (std::min)(min_, value);
      max_ = (std::max)(max_, value);
    }

    count_ += 1;
    sum_ += value;

    // tdigest::td_add(percentiles_.get(), value, 1);
  }
}
