class Org < ActiveRecord::Base

	has_many :agents

	validates :name, presence: true 
	validates :slug, presence: true 
	validates_format_of :slug, :with => /\A[_a-z0-9]+\z/
	validates :slug, uniqueness: true

end
