class Org < ActiveRecord::Base

	has_many :agents
	has_many :users
	has_many :robot_instances

	validates :name, presence: true 
	validates :slug, presence: true 
	validates_format_of :slug, :with => /\A[_a-z0-9]+\z/
	validates :slug, uniqueness: true 

	before_validation :derive_slug_if_necessary

	def self.name_to_slug(name)
		name.to_s.downcase.gsub(/[^a-zA-Z0-9 ]/, '').gsub(' ','_')
	end

	def self.slug_used?(slug)
		Org.find_by_slug(slug)
	end

	private

		def derive_slug_if_necessary
			self.slug = Org.name_to_slug(name) if self.slug.nil?
		end

end
